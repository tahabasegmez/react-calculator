package calculator

// Registry maps operation names to operations.
type Registry struct {
	ops map[string]Operation
}

func NewRegistry() *Registry {
	return &Registry{ops: make(map[string]Operation)}
}

func (r *Registry) Register(op Operation) {
	r.ops[op.Name()] = op
}

func (r *Registry) Get(name string) (Operation, bool) {
	op, ok := r.ops[name]
	return op, ok
}

// NewDefaultRegistry returns a registry with all Standard mode operations.
func NewDefaultRegistry() *Registry {
	r := NewRegistry()
	for _, op := range []Operation{
		add{}, subtract{}, multiply{}, divide{},
		percent{}, percentOf{}, sqrt{}, square{}, reciprocal{},
	} {
		r.Register(op)
	}
	return r
}
